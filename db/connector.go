package db

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type DataBase struct {
	DB *gorm.DB
}

func ConnectDB() (*DataBase, error) {
	gormDatabase, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := CreateTables(gormDatabase); err != nil {
		panic(err)
	}

	db := &DataBase{DB: gormDatabase}

	return db, nil
}

func CreateTables(db *gorm.DB) error {
	return db.AutoMigrate(&File{}, &Key{})
}
