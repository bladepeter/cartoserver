var fs = require('fs')
var mongoose = require('mongoose')
var Grid = require('gridfs-stream')
var Upload = require('../models/upload')
var processing = require('../tools/processing')


module.exports.list = function(req, res) {
  Upload.find({
    owner: req.params.username,
    is_deleted: false
  }, function(err, uploads) {
    if (err) {
      res.status(500).json({ error: err })
      return
    }

    res.status(200).json(uploads)
  })
}


module.exports.create = function(req, res) {
  var gfs = Grid(mongoose.connection.db, mongoose.mongo)
  var writeStream = gfs.createWriteStream({ filename: req.files[0].originalname })
  fs.createReadStream(req.files[0].path).pipe(writeStream)

  writeStream.on('error', function(err) {
    res.status(500).json({ error: err })
    return
  })

  writeStream.on('close', function(file) {
    var upload = new Upload({
      file_id: file._id,
      filename: file.filename,
      filesize: req.files[0].size,
      owner: req.params.username
    })

    upload.save(function(err) {
      if (err) {
        res.status(500).json({ error: err })
        return
      }

      res.status(200).json(upload)

      req.upload = upload
      processing(req)
    })
  })
}


module.exports.retrieve = function(req, res) {
  Upload.findOne({
    owner: req.params.username,
    upload_id: req.params.upload_id,
    is_deleted: false
  }, function(err, upload) {
    if (err) {
      res.status(500).json({ error: err })
      return
    }

    if (!upload) {
      res.sendStatus(404)
      return
    }

    res.status(200).json(upload)
  })
}


module.exports.download = function(req, res) {
  Upload.findOne({
    owner: req.params.username,
    upload_id: req.params.upload_id,
    is_deleted: false
  }, function(err, upload) {
    if (err) {
      res.status(500).json({ error: err })
      return
    }

    if (!upload) {
      res.sendStatus(404)
      return
    }

    var gfs = Grid(mongoose.connection.db, mongoose.mongo)
    var readStream = gfs.createReadStream({ _id: upload.file_id })
    readStream.on('error', function(err) {
      res.status(500).json({ error: err })
      return
    })


    res.setHeader('Content-disposition',
      'attachment; filename*=UTF-8\'\'' + upload.filename)
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
    readStream.pipe(res)
  })
}


module.exports.delete = function(req, res) {
  Upload.findOneAndUpdate({
    owner: req.params.username,
    upload_id: req.params.upload_id,
    is_deleted: false
  }, { is_deleted: true }, function(err) {
    if (err) {
      res.status(500).json({ error: err })
      return
    }

    res.sendStatus(204)
  })
}
