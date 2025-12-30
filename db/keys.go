package db

import (
	"crypto/rand"
	"encoding/base64"

	"gorm.io/gorm"
)

func (db *DataBase) NewAPIKey() (string, error) {
	newKey, err := keyGenerator()
	if err != nil {
		return "", err
	}

	res, err := db.isAPIKeyExist(newKey)
	if res {
		return db.NewAPIKey()
	}

	if !res {
		if err != nil && err != gorm.ErrRecordNotFound {
			panic(err)
		}
	}

	result := db.DB.Create(&Key{Key: newKey})
	if result.Error != nil {
		return "", result.Error
	}
	return newKey, nil
}

func (db *DataBase) GetAPIKey(key string) (Key, error) {
	var foundKey Key
	result := db.DB.Where("key = ?", key).First(&foundKey)
	if result.Error != nil {
		return Key{}, result.Error
	}
	return foundKey, nil
}

func (db *DataBase) isAPIKeyExist(key string) (bool, error) {
	var foundKey Key
	result := db.DB.Where("key = ?", key).First(&foundKey)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, result.Error
	}
	return true, nil
}

func keyGenerator() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
