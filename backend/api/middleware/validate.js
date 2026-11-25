function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) return res.status(400).json({ message: 'Validation failed.', errors: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });
    if (target === 'query') req.validatedQuery = result.data;
    else req[target] = result.data;
    next();
  };
}
module.exports = validate;
