import {DaemonApi} from 'js-oip'

const pug = require('pug')
const express = require('express')
const ta = require('../lib/timeago.js')

// expressjs configuration
const app = express()
const port = 3000
app.set('view engine', 'pug')

// Middleware function for async requests within expressjs
const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
        .catch(next)
    }

// Set static html/css for express
app.use(express.static('public'))

// Set the expressjs router with an endpoint for getting FLO data
app.get('/', asyncMiddleware(async(req, res, next) => {
    // Get OIP data and render using pug template engine
    const oipdata = await getFloData()
    formatTime(oipdata);
    res.render('index', { data: oipdata })
}))
app.listen(port, () => console.log(`oip-express listening on port ${port}`))

// js-oip API calls recent tZERO DLR records
let api = new DaemonApi();
const getFloData = async () => {
    let query = '"Cancel" OR "Execution Report" OR "Client Interest" OR "Inventory Posted"'
    let limit = 25
    let {success, txs, error} = await api.searchFloData(query, limit)
    let floData = ''
    return txs
}

// Format OIP time data for rendering
function formatTime(oipdata) {
    for (let tx of oipdata) {
        // Set timeago to timeago(tx time)
        tx.tx.timeago = ta.ago(tx.tx.time * 1000);

        // Set tx.tx.time to human readable time
        var newDate = new Date();
        newDate.setTime(tx.tx.time * 1000);
        tx.tx.time = newDate.toUTCString();
    }
}
