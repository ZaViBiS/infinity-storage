package db

func (db *DataBase) AddChunkToFile(c *Chunk) error {
	res := db.DB.Create(c)
	if res.Error != nil {
		return res.Error
	}
	return nil
}

func (db *DataBase) WriteNewFile(file File) (uint, error) {
	res := db.DB.Create(&file)
	if res.Error != nil {
		return 0, res.Error
	}
	return file.ID, nil
}

func (db *DataBase) CreateNewFile(filename string, size int64, key string, totalChunks int) (uint, error) {
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
	return file.ID, nil
}

func (db *DataBase) UpdateFileMetadata(fileID uint, filename string, size int64, totalChunks int) error {
	var file File
	res := db.DB.First(&file, fileID)
	if res.Error != nil {
		return res.Error
	}

	file.FileName = filename
	file.Size = size
	file.TotalChunks = totalChunks
	file.Status = "completed" // Assuming metadata update means file is completed

	res = db.DB.Save(&file)
	if res.Error != nil {
		return res.Error
	}
	return nil
}
