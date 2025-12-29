// Package tgbot відповідає за роботу з api телеграму, а саме відправкою і отриманням фалів
package tgbot

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
)

type TGBot struct {
	// NOTE: можливо, тут не потрібна структура
	bot tgbotapi.BotAPI
}

func BotInit() (TGBot, error) {
	if err := godotenv.Load(); err != nil {
		log.Err(err).Msg(".env file not found, using system env")
	}

	token, ok := os.LookupEnv("TOKEN")
	if !ok {
		return TGBot{}, fmt.Errorf("помилка отримання токену")
	}

	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return TGBot{}, err
	}

	return TGBot{bot: *bot}, nil
}

func (b *TGBot) SendFile(fileName string, data []byte) (string, error) {
	chatID := GetChatIDFromEnv()

	message, err := b.bot.Send(tgbotapi.NewDocument(chatID, tgbotapi.FileBytes{
		Name:  fileName,
		Bytes: data,
	}))
	// TODO: тут трохи не дуже з return`ами
	if err != nil {
		log.Err(err).Msg("помилка відправки повідомлення")
		return "", err
	}
	return message.Document.FileID, nil
}

func (b *TGBot) GetFileByID(fileID string) ([]byte, error) {
	fileURL, err := b.bot.GetFileDirectURL(fileID)
	if err != nil {
		log.Err(err).Str("fileID", fileID).Msg("помилка отримання прямого URL файлу")
		return nil, err
	}

	// Тепер завантажуємо файл за отриманою URL
	resp, err := http.Get(fileURL)
	if err != nil {
		return nil, fmt.Errorf("помилка при виконанні GET-запиту до файлу: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("помилка завантаження файлу: отримано статус %d %s", resp.StatusCode, resp.Status)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("помилка при зчитуванні тіла відповіді файлу: %w", err)
	}

	return bodyBytes, nil
}

func GetChatIDFromEnv() int64 {
	chatID := os.Getenv("CHATID")
	res, err := strconv.ParseInt(chatID, 10, 64)
	if err != nil {
		panic(err)
	}
	return res
}