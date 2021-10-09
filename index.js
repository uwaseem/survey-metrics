import Axios from 'axios'
import DayJs from 'dayjs'
import Express from 'express'

import Config from './config.json'
const app = Express()

app.listen(process.env.PORT || 3000)

app.get('/', (req, res) => res.status(200).json({ message: "All is good" }))
app.get('/id', async (req, res) => {
  try {
    const since = DayJs('2021-10-08').toISOString()

    const { data: { results: messages } } = await getMessageLogs(since)

    const total = countSMS(messages)

    res.status(200).json(total)
  } catch (error) {
    console.error('What is the error here?', error)
    res.status(200).json({ message: 'Ooopppps ... Something is not right' })
  }
})

app.all('*', (req, res) => res.sendStatus(404))

const getMessageLogs = async (since) => {
  const ApiKey = Config.infobip.IndonesiaApiKey
  const url = `${Config.infobip.baseUrl}/sms/1/logs`
  const headers = {
    'Authorization': `App ${ApiKey}`,
    'Accept': 'application/json'
  }

  const params = {
    'sentSince': since
  }

  return await Axios({ url, headers, params })
}

const countSMS = (messages) => {
  let PreTestDrive = 0
  let PostTestDrive = 0
  let PostBooking = 0
  let PostPurchase = 0

  for (const message of messages) {
    const { text } = message

    if (text.includes('Anda melewatkan janji test drive') || text.includes('test drive Anda telah dibatalkan')) {
      PreTestDrive++
      continue
    }

    if (text.includes('test drive Anda mmbr Anda petunjuk yg bnr')) {
      PostTestDrive++
      continue
    }

    if (text.includes('kami menyayangkan kepergian Anda')) {
      PostBooking++
      continue
    }

    if (text.includes('Selamat atas kenderaan baru Anda')) {
      PostPurchase++
      continue
    }
  }

  return { PreTestDrive, PostTestDrive, PostBooking, PostPurchase }
}
