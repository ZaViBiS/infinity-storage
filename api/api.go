// Package api відповідає за роботу з зовнішніми клієнтами
package api

import (
	"time"

	"github.com/ZaViBiS/infinity-storage/db"
	"github.com/ZaViBiS/infinity-storage/tgbot"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type API struct {
	app   *fiber.App
	tgbot *tgbot.TGBot
}

func NewServer(TGBot tgbot.TGBot, db *db.DataBase) *API {
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
	}

	api.setupRoutes()
	return api
}

func (a *API) setupRoutes() {
	a.app.Get("/", a.handleMain)
	a.app.Post("/send", a.handleSend)
}

func (a *API) handleMain(c *fiber.Ctx) error {
	return nil
}

func (a *API) handleSend(c *fiber.Ctx) error {
	// TODO: треба якось додати перевірки розміру, можливо ще чогось
	data := c.Body()

	fileID, err := a.tgbot.SendFile("test.txt", data)
	if err != nil {
		panic(err)
	}
	log.Debug().Str("file id", fileID)

	// HACK: тут не дуже добре, що користувач отримує доступ саме до id повідомлення,
	// але це можна потім виправити зробивши прошарку з генерацією рандомних ключів
	return c.JSON(fiber.Map{"file id": fileID})
}

func (a *API) handleGetFile(c *fiber.Ctx) error {
	c.Body()
	a.tgbot.GetFileByID()
}

func (a *API) Start() {
	log.Fatal().Err(a.app.Listen(":8081")).Msg("помилка запуску http серверу")
}
