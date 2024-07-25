// Middleware to handle errors centrally
function errorHandler(err, req, res, next) {
    console.error('Error:', err.message || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
}

module.exports = errorHandler;
