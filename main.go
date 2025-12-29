package main

import (
	"github.com/ZaViBiS/infinity-storage/api"
	"github.com/ZaViBiS/infinity-storage/db"
	"github.com/ZaViBiS/infinity-storage/tgbot"
)

func main() {
	tgbot, err := tgbot.BotInit()
	if err != nil {
		panic(err)
	}

	db, err := db.ConnectDB()
	if err != nil {
		panic(err)
	}

	server := api.NewServer(tgbot, db)
	server.Start()
}
