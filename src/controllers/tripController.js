const getAll = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const create = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const getOne = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const update = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const cancel = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const review = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const complete = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })
const getExpenses = async (_req, res) => res.json({ success: true, message: 'endpoint stub', data: [] })

export const tripController = { getAll, create, getOne, update, cancel, review, complete, getExpenses }
