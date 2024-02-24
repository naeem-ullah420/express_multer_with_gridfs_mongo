const express = require('express')
const app = express()
const mongoose = require('mongoose')
const multer = require('multer');
const Grid = require('gridfs-stream');
const {GridFsStorage} = require('multer-gridfs-storage');


// Connect to MongoDB using Mongoose
mongoose.connect('mongodb://localhost:27017/mongodb_gridfs');

Grid.mongo = mongoose.mongo;
let gfs, gridFSBucket;
mongoose.connection.once('open', () => {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('files');
    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection, {
        bucketName: "files",
    });
    console.log("gridFS Initialized")
})

mongoose.connection.once('error', (e) => {
    console.log("Error in connecting mongodb: ", e)
})


// Set up storage engine using Multer and GridFS
const storage = new GridFsStorage({
    url: 'mongodb://localhost:27017/mongodb_gridfs',
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return {
          filename: file.originalname,
          bucketName: 'files'
        };
    },
})

const upload = multer({ storage: storage });

app.set('view engine', 'ejs');

app.get("/", async (req, res) => {
    const files = await gfs.files.find({}).sort({ uploadDate: -1 }).toArray()
    return res.render("pages/home", {
        files: files
    })
    
})


app.post("/uploadFile", upload.array('files'), (req, res) => {
    return res.redirect("/")
})

app.get("/getFile/:file_id", async (req, res) => {
    try {
        const file = await gfs.files.findOne({ _id: new mongoose.Types.ObjectId(req.params.file_id) });
        if(file.contentType.includes("image") || file.contentType.includes("vide")) {
            res.setHeader("content-type", file.contentType);
        } else {
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
        }
        const readStream = gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(file._id));
        readStream.pipe(res);
    } catch (error) {
        console.log("Error: ", error)
        res.send("not found");
    }
});

app.get("/deleteFile/:file_id", async (req, res) => {
    try {
        await gfs.files.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.file_id) });
        return res.redirect("/")
    } catch (error) {
        console.log("Error: ", error)
        res.send("not found");
    }
});




app.listen(8000, () => {
    console.log("Server is listening at http://localhost:8000")
})