const service = require("../../services/category.service");
async function list(req, res, next) {
    try {
        res.json({ items: await service.list(req.user?.role === "admin") });
    } catch (error) {
        next(error);
    }
}
async function create(req, res, next) {
    try {
        res.status(201).json(await service.create(req.body));
    } catch (error) {
        next(error);
    }
}
async function update(req, res, next) {
    try {
        res.json(await service.update(req.params.id, req.body));
    } catch (error) {
        next(error);
    }
}
async function remove(req, res, next) {
    try {
        res.json(await service.remove(req.params.id));
    } catch (error) {
        next(error);
    }
}
module.exports = { list, create, update, remove };
