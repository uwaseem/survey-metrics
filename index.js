import Axios from 'axios'
import DayJs from 'dayjs'
import Express from 'express'
import Path from 'path'

import Config from './config.json'

const { delighted, infobip, password, sms } = Config
const TOUCHPOINTS = ['PreTestDrive', 'PostTestDrive', 'PostBooking', 'PostPurchase']
const COUNTRY_MAPPING = {
  'id': 'Indonesia',
  'my': 'Malaysia',
  'th': 'Thailand'
}

const __dirname = Path.resolve();

const app = Express()
app.listen(process.env.PORT || 3000)

app.set("views", Path.join(__dirname, "views"));
app.set("view engine", "pug");

app.get('/', (req, res) => res.status(200).json({ message: "All is good" }))
app.get('/metrics/:country', async (req, res) => {
  if (req.query.pwd !== password) {
    res.sendStatus(401)
  }

  const country = COUNTRY_MAPPING[req.params.country]
  const startDate = DayJs().startOf('month')
  const endDate = DayJs()

  try {
    const { data: { results: messages }} = await getMessageLogs(country, startDate)
    const totalSurveyResponses = await getSurveyMetrics(country, startDate, endDate)
    const totalSMS = countSMS(messages, country)

    const responseRate = calculateResponseRate(totalSMS, totalSurveyResponses)

    const results = TOUCHPOINTS.map(touchPoint => ({
      name: touchPoint,
      totalSMS: totalSMS[touchPoint],
      totalSurveyResponses: totalSurveyResponses[touchPoint],
      responseRate: responseRate[touchPoint]
    }))

    res.render("index", {
      startDate: DayJs(startDate).format('D MMMM YY H:mm:ss'),
      endDate: DayJs(endDate).format('D MMMM YY HH:mm:ss'),
      country,
      results
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
    const percentage = survey[touchPoint] / sms[touchPoint] * 100
    responseRate[touchPoint] = `${+percentage.toFixed(2)}%`
  }
  return responseRate
}
