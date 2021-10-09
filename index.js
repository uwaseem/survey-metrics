import Express from 'express'

const app = Express()

app.listen(process.env.PORT || 3000)

app.get('/', (req, res) => res.status(200).json({ message: "All is good" }))
