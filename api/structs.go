package api

type RequestNew struct {
	Filename    string `json:"filename"`
	TotalChunks int
	Size        int    `json:"size"`
	Key         string `json:"key"`
}

type RequestSendChunk struct {
	FileID   int    `json:"file_id"`
	Position int    `json:"chunk_position"`
	Key      string `json:"key"`
	RawData  []byte
}
