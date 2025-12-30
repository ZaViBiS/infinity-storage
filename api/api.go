// Package api відповідає за роботу з зовнішніми клієнтами
package api

import (
	"math"
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

func NewServer(TGBot tgbot.TGBot, database *db.DataBase) *API {
	app := fiber.New()

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
		queue: make(chan *db.Chunk, 100),
	}

	api.setupRoutes()

	go api.uploaderWorker()

	return api
}

func (a *API) setupRoutes() {
	a.app.Get("/", a.handleMain)
	a.app.Get("/get_api_key", a.handleGetAPIKey)
	a.app.Post("/new", a.handleNew)
	a.app.Post("/send_chunk", a.handleSendChunk)
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

func (a *API) handleNew(c *fiber.Ctx) error {
	r := new(RequestNew)

	if err := c.BodyParser(r); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "wrong format"})
	}

	r.TotalChunks = int(math.Ceil(float64(r.Size) / math.Ceil(float64(10*1024*1024))))

	fileID, err := a.db.CreateNewFile(r.Filename, r.Size, r.Key, r.TotalChunks)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erororo"})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"file_id": fileID, "number_of_chunks": r.TotalChunks})
}

func (a *API) handleSendChunk(c *fiber.Ctx) error {
	r := new(RequestSendChunk)
	r.RawData = c.BodyRaw()

	if err := c.BodyParser(r); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "wrong format"})
	}

	chunk := &db.Chunk{
		FileID:         r.FileID,
		Position:       r.Position,
		Size:           len(r.RawData),
		Status:         "pending",
		TelegramFileID: "",
		Data:           r.RawData,
	}
	a.queue <- chunk
	return c.SendStatus(200)
}

func (a *API) Start() {
	log.Fatal().Err(a.app.Listen(":8081")).Msg("помилка запуску http серверу")
}
