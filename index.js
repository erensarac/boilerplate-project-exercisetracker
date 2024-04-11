const express = require('express')
const mongoose = require("mongoose")
const app = express()
const cors = require('cors')
const bodyParser = require("body-parser");
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: String
})

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
})

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
})

const userModel = mongoose.model("User", userSchema);
const exerciseModel = mongoose.model("Exercise", exerciseSchema)
const logModel = mongoose.model("Log", logSchema);

app.get("/api/users", async (req, res) => {
  const users = await userModel.find();
  res.json([...users])
})

app.post("/api/users", async (req, res) => {
  const user = await userModel.create({ username: req.body.username })
  await logModel.create({ _id: new mongoose.Types.ObjectId(user._id), username: req.body.username, count: 0, log: [] })

  res.json({ username: req.body.username, _id: user._id })
})

app.post("/api/users/:id/exercises", async (req, res) => {
  const user = await userModel.findOne({ _id: req.params.id })

  if (!user) {
    throw new Error("Faield")
  }

  const exercises = await exerciseModel.create({
    username: user.username,
    duration: req.body.duration,
    date: new Date(req.body.date || Date.now()).toISOString().slice(0, 10),
    description: req.body.description
  })

  await logModel.findOneAndUpdate({ _id: user._id }, { $inc: { count: 1 }, $push: { log: exercises } })


  res.status(200).json({
    _id: user._id,
    username: user.username,
    description: exercises.description,
    duration: exercises.duration,
    date: new Date(exercises.date).toDateString()
  })
})

app.get("/api/users/:id/logs", async (req, res) => {
  const { from, to, limit } = req.query;

  if (from && to) {
    const logs = await logModel.findOne({ _id: req.params.id }).then((data) => {
      data.log = data.log.filter((log) => {
        if (log.date > from && log.date < to) {
          log.date = new Date(log.date).toDateString()
          return log
        }
      }).slice(0, limit ? limit : data.log.length)
      return data
    })

    return res.status(200).json(logs)
  }

  const logs = await logModel.findOne({ _id: req.params.id }).then((logs) => {
    logs.log = logs.log.map((log) => {
      log.date = new Date(log.date).toDateString()
      return log
    }).slice(0, limit ? limit : logs.log.length)
    return logs;
  })

  res.status(200).json(logs)
})


mongoose.connect(process.env.MONGODB_URI);

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
