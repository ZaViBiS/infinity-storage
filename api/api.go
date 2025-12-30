// Package api відповідає за роботу з зовнішніми клієнтами
package api

import (
	"io"
	"mime"
	"mime/multipart"
	"strings"
	"time"

	"github.com/ZaViBiS/infinity-storage/db"
	"github.com/ZaViBiS/infinity-storage/tgbot"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type API struct {
	app   *fiber.App
	tgbot *tgbot.TGBot
	db    *db.DataBase
	queue chan *db.Chunk
}

const (
	ChunkSize        = 20 * 1024 * 1024
	ChunksBufferSize = 7 // 140 MB
)

func NewServer(TGBot tgbot.TGBot, database *db.DataBase) *API {
	app := fiber.New(fiber.Config{
		DisablePreParseMultipartForm: true,
		StreamRequestBody:            true,
		BodyLimit:                    -1,
	})

	app.Use(func(c *fiber.Ctx) error {
		err := c.Next()
		start := time.Now()

		statusCode := c.Response().StatusCode()
		event := log.Info()
		if err != nil {
			event = log.Error().Err(err)
		}

		event.Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", statusCode).
			Dur("latency", time.Since(start)).
			Str("ip", c.IP()).
			Str("user_agent", c.Get("User-Agent")).
			Msg("request")

		return err
	})

	api := &API{
		app:   app,
		tgbot: &TGBot,
		db:    database,
		queue: make(chan *db.Chunk, 5),
	}

	api.setupRoutes()

	go api.uploaderWorker()

	return api
}

func (a *API) setupRoutes() {
	a.app.Get("/", a.handleMain)
	a.app.Get("/get_api_key", a.handleGetAPIKey)
	a.app.Post("/upload", a.handleUpload)
}

func (a *API) handleMain(c *fiber.Ctx) error {
	return c.SendStatus(200)
}

func (a *API) handleGetAPIKey(c *fiber.Ctx) error {
	newKey, err := a.db.NewAPIKey()
	if err != nil {
		log.Err(err).Msg("помилка створення api ключа")
		return c.SendStatus(500)
	}
	return c.JSON(fiber.Map{"key": newKey})
}

func (a *API) handleUpload(c *fiber.Ctx) error {
	// Перевірка API ключа
	key, err := a.validateAPIKey(c)
	if err != nil {
		log.Warn().Err(err).Msg("невалідний API ключ")
		return err
	}
	log.Debug().Str("key", key[:10]+"...").Msg("API ключ валідний")

	req := c.Context().Request

	ct := string(req.Header.ContentType())
	if !strings.HasPrefix(ct, "multipart/form-data") {
		return fiber.NewError(400, "multipart required")
	}

	_, params, err := mime.ParseMediaType(ct)
	if err != nil {
		return err
	}
	boundary := params["boundary"]

	mr := multipart.NewReader(req.BodyStream(), boundary)

	// Create an initial file entry with placeholder metadata
	fileID, err := a.db.CreateNewFile("", 0, key, 0)
	if err != nil {
		log.Err(err).Msg("помилка створення файлу")
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create file")
	}

	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		if part.FormName() != "file" {
			continue
		}

		filename := part.FileName()
		log.Info().Str("file", filename).Msg("отримано файл")

		readBuf := make([]byte, 64*1024)
		chunk := make([]byte, 0, ChunkSize)
		chunkIndex := 0
		var total int64

		for {
			n, err := part.Read(readBuf)
			if n > 0 {
				data := readBuf[:n]
				total += int64(n)

				for len(data) > 0 {
					space := ChunkSize - len(chunk)

					if space > len(data) {
						chunk = append(chunk, data...)
						data = nil
					} else {
						chunk = append(chunk, data[:space]...)
						data = data[space:]

						// 🚀 ОБРОБКА ЛОГІЧНОГО ЧАНКУ
						log.Debug().
							Int("chunk", chunkIndex).
							Int("size", len(chunk)).
							Msg("processing chunk")

						a.queue <- &db.Chunk{
							FileID:   fileID, // Corrected case
							Position: chunkIndex,
							Size:     int64(len(chunk)),
							Data:     chunk,
						}

						chunkIndex++
						chunk = chunk[:0]
					}
				}
			}

			if err == io.EOF {
				break
			}
			if err != nil {
				return err
			}
		}

		// хвіст
		if len(chunk) > 0 {
			log.Debug().
				Int("chunk", chunkIndex).
				Int("size", len(chunk)).
				Msg("processing last chunk")

			a.queue <- &db.Chunk{ // Add this to send the last chunk
				FileID:   fileID,
				Position: chunkIndex,
				Size:     int64(len(chunk)),
				Data:     chunk,
			}
		}

		// FIXME: тут не правельно пораховано: було фактично 51 чанк, але в даних файлу записало 52
		// Update file metadata after upload is finished
		totalChunks := int(total / ChunkSize)
		if total%ChunkSize != 0 {
			totalChunks++
		}
		if err := a.db.UpdateFileMetadata(fileID, filename, total, totalChunks); err != nil {
			log.Err(err).Uint("fileID", fileID).Msg("помилка оновлення метаданих файлу")
			// Decide how to handle this error, maybe return an error to client or just log
		}

		log.Info().
			Str("file", filename).
			Int64("size", total).
			Msg("upload finished")
	}
	return c.SendStatus(fiber.StatusAccepted)
}

// func (a *API) handleUpload(c *fiber.Ctx) error {
// 	log.Debug().Msg("початок обробки upload")
//
// 	// Перевірка API ключа
// 	key, err := a.validateAPIKey(c)
// 	if err != nil {
// 		log.Warn().Err(err).Msg("невалідний API ключ")
// 		return err
// 	}
// 	log.Debug().Str("key", key[:10]+"...").Msg("API ключ валідний")
//
// 	// Отримуємо Content-Type
// 	contentType := string(c.Request().Header.ContentType())
// 	log.Info().Str("content_type", contentType).Msg("content type")
//
// 	if !strings.HasPrefix(contentType, "multipart/form-data") {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"error": "потрібен multipart/form-data",
// 		})
// 	}
//
// 	// Витягуємо boundary
// 	boundary := ""
// 	parts := strings.Split(contentType, "boundary=")
// 	if len(parts) == 2 {
// 		boundary = parts[1]
// 	} else {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"error": "boundary не знайдено",
// 		})
// 	}
//
// 	bodyStream := c.Context().RequestBodyStream()
//
// 	mr := multipart.NewReader(bodyStream, boundary)
//
// 	fileID, err := a.db.CreateNewFile(
// 		file.Filename,
// 		file.Size,
// 		key,
// 		int(file.Size/ChunkSize)) // FIXME: тут не правельно рахуются кількість чанків
// 	if err != nil {
// 		panic(err)
// 	}
//
// 	buffer := make([]byte, ChunkSize)
// 	chunkNumber := 0
//
// 	for {
// 		chunk, err := mr.NextRawPart()
// 		if err != nil {
// 			panic(err)
// 		}
// 		chunkNumber++
// 		rawData := buffer[:n]
//
// 		chunk := &db.Chunk{
// 			FileID:   fileID,
// 			Position: chunkNumber,
// 			Size:     int64(len(rawData)),
// 			Data:     rawData,
// 		}
//
// 		a.queue <- chunk
//
// 		log.Debug().Int64("size", chunk.Size).Msg("прийнято чанк")
// 	}
//
// 	return c.SendStatus(fiber.StatusAccepted)
// }

func (a *API) validateAPIKey(c *fiber.Ctx) (string, error) {
	key := c.Get("Authorization")
	if key != "" {
		key = strings.TrimPrefix(key, "Bearer ")
	} else {
		key = c.Get("X-API-Key")
	}

	if key == "" {
		return "", fiber.NewError(fiber.StatusUnauthorized, "no API key")
	}

	validKey, err := a.db.GetAPIKey(key)
	if err != nil {
		return "", fiber.NewError(fiber.StatusUnauthorized, "no API key")
	}
	return validKey.Key, nil
}

func (a *API) Start() {
	log.Fatal().Err(a.app.Listen(":8081")).Msg("помилка запуску http серверу")
}
