import {DaemonApi} from 'js-oip'

const pug = require('pug')
var getJSON = require('get-json')
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
    await formatTzero(oipdata);
    res.render('index', { data: oipdata })
}))
app.listen(port, () => console.log(`oip-express listening on port ${port}`))

// js-oip API calls recent tZERO DLR records
let api = new DaemonApi();
const getFloData = async () => {
    let query = '"Cancel" OR "Execution Report" OR "Client Interest" OR "Inventory Posted"'
    let limit = 15
    let {success, txs, error} = await api.searchFloData(query, limit)
    return txs
}

// Get inputs object from a txid
const getInputsFromTxid = (txid) => {
  //console.log(txid)
  return getJSON('http://network.flo.cash/api/getrawtransaction?txid=' + txid + '&decrypt=1')
    .then(function(response) {
      return response.vin
    })
    .catch(function(err) {
      console.log("Error getting inputs from txid " + txid + ": ")
      console.log(err)
    })
}

// Get an address from a vout in format <txid, vout>
const getAddressFromVout = (txid, vout) => {
  return getJSON('http://network.flo.cash/api/getrawtransaction?txid=' + txid + '&decrypt=1')
    .then(function(response) {
      for (let i = 0; i < response.vout.length; i++) {
        if (response.vout[i].n != vout) continue;
        else return response.vout[i].scriptPubKey.addresses[0];
      }
    })
    .catch(function(err) {
      console.log("Error getting address from txid " + txid + " vout " + vout + ": ")
      console.log(err)
    })
}

async function getAddressesFromVin(vin) {
  let addrs = []
  for (let i = 0; i < vin.length; i++) {
    let addr = await getAddressFromVout(vin[i].txid, vin[i].vout)
    addrs.push(addr)
  }
  return addrs
}


// Returns true if the array of addrs passed 
// contains at least one of the known tZERO addresses
function checkKnownAddrs(addrs) {
  const knownTzeroAddrs = [
    "FUDgz1Qj8HCm4F1RfNMLj4Miyq9REsQiLd",
    "FQ5VFz73Ncw9chozAApnhppCpKhhYMX9vP",
    "FDnukWAtoBQveQ7Dbb1bsipcoPafokzgxr",
    "FAM8gVszhJMNGHxVdHakoLAQXiRfcxudKU"
  ]

  // If one of the known tZERO addresses is in the
  // inputs, that means the inputs were signed by
  // tZERO, and the transaction floData was put on
  // the blockchain by tZERO. 
  for (let i = 0; i < knownTzeroAddrs.length; i++) {
    for (let j = 0; j < addrs.length; j++) {
      if (knownTzeroAddrs[i] === addrs[j]) return true
    }
  }

  // If the transaction inputs do not match one of
  // the tZERO inputs then we can safely assume 
  // the transaction floData is not from tZERO.
  return false
}

// Format array to remove non-tZERO records
async function formatTzero(oipdata) {
  await getSpliceIndexes(oipdata).then(spliceIndexes => {
    // Splice out non-tZERO data
    let spliced = 0
    for (let i = 0; i < spliceIndexes.length; i++) {
      oipdata.splice(spliceIndexes[i-(spliced++)], 1)
    }
  })
  .catch(function(err) { console.log("Error splicing indexes", err) })
}

// Get splice indexes
async function getSpliceIndexes(oipdata) {
  let spliceIndexes = []
  for (const [index, value] of oipdata.entries()) {
    let vin = await getInputsFromTxid(value.tx.txid)
    let addrs = await getAddressesFromVin(vin)

    // Queue up non-tZERO data to be removed
    if (!checkKnownAddrs(addrs)) spliceIndexes.push(index)
  }
  return spliceIndexes
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
