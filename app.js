if (process.env.NODE_ENV != "production")
  require('dotenv').config()
var createError = require('http-errors');
var express = require('express');

var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();
app.use(cors());
// Remove duplicate server initialization - server is created in bin/www
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
// Initialize database models for Kanban board
const initializeKanban = require('./db/initializeKanban');

// Log server initialization for better monitoring and debugging
console.log('Marine Management System backend initializing - ' + new Date().toISOString());

// Call initialization asynchronously - will create data if needed
initializeKanban().catch(err => {
  console.error('Failed to initialize Kanban data:', err);
});

app.use('/api', require('./routes/index'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
