package api

type RequestNew struct {
	Filename string
	Size     int
	Key      string
}

type RequestSendChunk struct {
	FileID   int    `json:"file_id"`
	Position int    `json:"chunk_position"`
	Key      string `json:"key"`
	RawData  []byte
}
