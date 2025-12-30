package api

// type Queue struct {
// 	Queue chan Task
// 	wg    sync.WaitGroup
// }

type Task struct {
	Data     []byte
	Position int
	Owner    string // api key of owner
}

// func (a *API) UploaderWorker() {
// 	for {
// 		task := <-a.queue
//
// 		fileID, err := a.tgbot.SendFile("noname.txt", task.Data)
// 		if err != nil {
// 			// FIXME: ну тут треба нормально зробити
// 			panic(err)
// 		}
// 		log.Debug().Str("fileID", fileID).Msg("файл було завантажено в тг")
//
// 		chunk := db.Chunk{
// 			FileID: ,
// 			Position: task.Position,
// 			Size:     len(task.Data),
// 		}
//
// 		if err := a.db.AddChunkToFile(chunk); err != nil {
// 			panic(err)
// 		}
//
// 	}
// }
