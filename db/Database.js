const mongoose = require("mongoose");

let instance = null;
class Database {

    constructor() {
        if (!instance) {
            this.mongoConnection = null;
            instance = this;
        }

        return instance;
    }

    async connect(options) {
        try {
            console.log("DB Connecting to", options.CONNECTION_STRING);
            // Add connection options for better reliability
            let db = await mongoose.connect(options.CONNECTION_STRING, {
                serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            });

            this.mongoConnection = db;
            console.log("DB Connected Successfully to", options.CONNECTION_STRING);
            return db;
        } catch (err) {
            console.error("Database Connection Error:", err.message);
            console.error("Please ensure MongoDB is running on the specified connection string.");
            // Don't exit process in production, let the application handle errors gracefully
            if (process.env.NODE_ENV === 'production') {
                console.error('Application will continue without database connection.');
                return null;
            } else {
                console.error('Exiting application due to database connection failure.');
                process.exit(1);
            }
        }
    }

}

module.exports = Database;