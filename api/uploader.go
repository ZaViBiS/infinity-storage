package api

import (
	"time"

	"github.com/rs/zerolog/log"
)

type Task struct {
	Data     []byte
	Position int
	Owner    string // api key of owner
}

func (a *API) uploaderWorker() {
	for {
		chunk := <-a.queue

		TelegramFileID, err := a.tgbot.SendFile("noname.txt", chunk.Data)
		if err != nil {
			// TODO: зробити нормальну обробку
			panic(err)
		}
		chunk.TelegramFileID = TelegramFileID
		chunk.Data = nil

		log.Debug().Uint("fileID", chunk.FileID).Msg("файл було завантажено")

		if err := a.db.AddChunkToFile(chunk); err != nil {
			panic(err)
		}
		time.Sleep(2 * time.Second)
	}
}
