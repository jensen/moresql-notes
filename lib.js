const pg = require('pg')
const client = new pg.Client({
  database: 'w4d1'
})

client.connect()

module.exports = {
  client
}