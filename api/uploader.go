package api

import "github.com/rs/zerolog/log"

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

		log.Debug().Int("fileID", chunk.FileID).Msg("файл було завантажено")

		if err := a.db.AddChunkToFile(chunk); err != nil {
			panic(err)
		}
	}
}
