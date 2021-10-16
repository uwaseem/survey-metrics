import Axios from 'axios'
import DayJs from 'dayjs'
import Express from 'express'

import Config from './config.json'

const { delighted, infobip, password, sms } = Config
const TOUCHPOINTS = ['PreTestDrive', 'PostTestDrive', 'PostBooking', 'PostPurchase']
const COUNTRY_MAPPING = {
  'id': 'Indonesia',
  'my': 'Malaysia',
  'th': 'Thailand'
}

const app = Express()
app.listen(process.env.PORT || 3000)

app.get('/', (req, res) => res.status(200).json({ message: "All is good" }))
app.get('/metrics/:country', async (req, res) => {
  if (req.query.pwd !== password) {
    res.sendStatus(401)
  }

  const country = COUNTRY_MAPPING[req.params.country]
  const startDate = DayJs().startOf('month')
  console.log('what is the start date here?', startDate)
  const endDate = DayJs()
  console.log('what is the end date here?', endDate)

  try {
    const { data: { results: messages }} = await getMessageLogs(country, startDate)
    const totalSMS = countSMS(messages, country)


    const totalSurveyResponses = await getSurveyMetrics(country, startDate, endDate)

    const responseRate = calculateResponseRate(totalSMS, totalSurveyResponses)

    res.status(200).json({
      startDate: DayJs(startDate).format('D/M/YY H:mm:ss'),
      endDate: DayJs(endDate).format('D/M/YY HH:mm:ss'),
      totalSMS,
      totalSurveyResponses,
      responseRate
    })
  } catch (error) {
    console.error('What is the error here?', error)
    res.status(200).json({ message: 'Ooopppps ... Something is not right' })
  }
})

app.all('*', (req, res) => res.sendStatus(404))

const getSurveyMetrics = async (country, startDate, endDate) => {
  const url = delighted.BaseUrl
  const totalResponses = {}

  for (const touchPoint of TOUCHPOINTS) {
    const auth = {
      'username': delighted[touchPoint].ApiKey,
      'password': ''
    }
    const params = { 'trend': delighted[touchPoint].TrendId[country], since: DayJs(startDate).unix(), until: DayJs(endDate).unix() }
    const { data: { response_count: responseCount }} = await Axios({ url, auth, params })

    totalResponses[touchPoint] = responseCount
  }
  return totalResponses
}

const getMessageLogs = async (country, startDate) => {
  const ApiKey = infobip[country].ApiKey

  const url = `${infobip[country].BaseUrl}/sms/1/logs`
  const headers = { 'Authorization': `App ${ApiKey}` }
  const params = { 'sentSince': DayJs(startDate).toISOString(), limit: 1000 }

  return await Axios({ url, headers, params })
}

const countSMS = (messages, country) => {
  let PreTestDrive = 0
  let PostTestDrive = 0
  let PostBooking = 0
  let PostPurchase = 0

  for (const message of messages) {
    const { text } = message

    if (text.includes(sms[country].PreTestDrive[0]) || text.includes(sms[country].PreTestDrive[1])) {
      PreTestDrive++
      continue
    }

    if (text.includes(sms[country].PostTestDrive)) {
      PostTestDrive++
      continue
    }

    if (text.includes(sms[country].PostBooking)) {
      PostBooking++
      continue
    }

    if (text.includes(sms[country].PostPurchase)) {
      PostPurchase++
      continue
    }
  }

  return { PreTestDrive, PostTestDrive, PostBooking, PostPurchase }
}

const calculateResponseRate = (sms, survey) => {
  const responseRate = {}

  for (const touchPoint of TOUCHPOINTS) {
    responseRate[touchPoint] = `${survey[touchPoint] / sms[touchPoint] * 100}%`
  }
  return responseRate
}
