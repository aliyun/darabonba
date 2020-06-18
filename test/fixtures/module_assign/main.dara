import OSS

model CallResponse{
  file: OSS.File
}

static function call(): CallResponse {
  var fileInfo = new OSS.FileInfo{
    mime = 'plain/txt'
  };
  var file = new OSS.File{
    filename = 'test',
    info = fileInfo
  };

  return new CallResponse{
    file = file
  };
}
