const express = require('express')
const { default: mongoose, mongo } = require('mongoose')
const app = express()
const multer = require('multer')
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

app.set('view engine', 'ejs')

const MONGODB_URI = "mongodb://127.0.0.1:27017/mongodb_gridfs"

mongoose.connect(MONGODB_URI)

let gfs, gridFsBucket;
mongoose.connection.once('open', () => {
    console.log("mongodb connected")
    gfs = Grid(mongoose.connection.db, mongo)
    gfs.collection('files')
    gridFsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection, {
        bucketName:'files'
    })
    console.log("GridFs initialized")
})

mongoose.connection.once('error', (e) => {
    console.log("mongodb connection error", e)
})


const storage = new GridFsStorage({ 
    url : MONGODB_URI,
    file: (req, file) => {
        console.log(file)
        return {
            filename:   file.originalname,
            bucketName: 'files'
        };
    }
});

const upload = multer({ storage: storage })

app.get("/", async (req, res) => {
    let files = await gfs.files.find({}).sort({
        'uploadDate' : -1
    }).toArray()
    console.log(files)
    res.render('pages/home', {
        "files": files
    })
})



app.post("/uploadFile", upload.array('files', 10), (req, res) => {
    return res.redirect("/")
})


app.get('/getFile/:fileId', async (req, res) => {
    try {
        let file = await gfs.files.findOne({
            '_id': new mongoose.Types.ObjectId(req.params.fileId)
        })
        
        if(file.contentType.includes("image") || file.contentType.includes("video")) {
            res.setHeader('Content-Type', file.contentType)
        } else {
            res.setHeader('Content-Type', file.contentType)
            res.setHeader('Content-Disposition', 'attachment; filename= ' + file.filename)
        }

        const readStream = gridFsBucket.openDownloadStream(file._id)
        readStream.pipe(res)
    } catch (error) {
        console.log("Error: ", e)
        res.send("File not found")
    }
})

app.get('/deleteFile/:fileId', async (req, res) => {
    try {
        let file = await gfs.files.deleteOne({
            '_id': new mongoose.Types.ObjectId(req.params.fileId)
        })
        return res.redirect("/")
    } catch (error) {
        console.log("Error: ", e)
        res.send("File not found")
    }
})

app.listen(8000, () => {
    console.log("server is running at http://localhost:8000")
})