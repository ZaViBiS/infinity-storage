// Package db save ids,api keys and info about files
package db

import (
	"gorm.io/gorm"
)

// File - зберігає дані про файл і його chunks
// File store data about the file and its chunks
type File struct {
	// TODO: додадти id, щоб можна було додавати до ключа
	gorm.Model
	FileName string  `json:"filename"`
	Size     int     `json:"size"`
	Chunks   []Chunk `gorm:"type:jsonb"`
}

// Chunk - зберігає id файлу і його позицію в основному файлі
// це важливо для збирання основного фалйу в правельній послідовності
// Chunk store chunk id and its position in the file
// It`s important to store the position to assamble the file
type Chunk struct {
	gorm.Model
	ChunkID  string
	Position int
	Size     int
}

// Key - зберігає api ключи для перевірки
// Key - saves api keys for auth
type Key struct {
	// TODO: зробити hash суму замість сирого ключа
	gorm.Model
	Key string
}
