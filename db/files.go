package db

func (db *DataBase) AddChunkToFile(c *Chunk) error {
	res := db.DB.Create(c)
	if res.Error != nil {
		return res.Error
	}
	return nil
}

func (db *DataBase) CreateNewFile(filename string, size int, key string, totalChunks int) (int, error) {
	file := File{
		FileName:    filename,
		Size:        size,
		TotalChunks: totalChunks,
		Status:      "uploading",
		OwnerAPIKey: key,
	}
	res := db.DB.Create(&file)
	if res.Error != nil {
		return 0, res.Error
	}
	return int(file.ID), nil
}
