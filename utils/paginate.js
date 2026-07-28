// Applied only when the caller explicitly asks for it (page/limit query params
// present), so existing unpaginated consumers (bs-user storefront, dropdown
// lookups) keep getting a plain array back unchanged.
function wantsPagination(req) {
  return req.query.page !== undefined || req.query.limit !== undefined;
}

function paginate(array, req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  const total = array.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    data: array.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
  };
}

module.exports = { wantsPagination, paginate };
