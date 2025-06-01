/**
 * Database initialization script for Kanban board
 * This script creates initial columns, tasks, and order if they don't exist
 */
const mongoose = require('mongoose');
const Column = require('./models/Column');
const Task = require('./models/Task');
const Order = require('./models/Order');
const Database = require('./Database');
const { CONNECTION_STRING } = require('../config');

// Initial data for columns
const initialColumns = [
  { name: 'Backlog' },
  { name: 'In Progress' },
  { name: 'Review' },
  { name: 'Done' }
];

// Initial tasks for each column
const initialTasks = [
  { 
    name: 'Setup project structure', 
    description: 'Create folders and initial files', 
    priority: 'high',
    status: 'to-do',
    reporter: {
      id: 'system',
      name: 'System',
      avatarUrl: ''
    }
  },
  { 
    name: 'Configure database', 
    description: 'Set up MongoDB connection', 
    priority: 'high',
    status: 'in-progress',
    reporter: {
      id: 'system',
      name: 'System',
      avatarUrl: ''
    }
  },
  { 
    name: 'Create UI components', 
    description: 'Design and implement UI components', 
    priority: 'medium',
    status: 'review',
    reporter: {
      id: 'system',
      name: 'System',
      avatarUrl: ''
    }
  },
  { 
    name: 'Write unit tests', 
    description: 'Create tests for all components', 
    priority: 'low',
    status: 'done',
    reporter: {
      id: 'system',
      name: 'System',
      avatarUrl: ''
    }
  }
];

/**
 * Initialize the Kanban board in the database
 */
const initializeKanban = async () => {
  try {
    console.log('Checking if Kanban data needs to be initialized...');
    
    // Connect to database if not already connected
    await new Database().connect({ CONNECTION_STRING });
    
    // Check if columns already exist
    const columnsCount = await Column.countDocuments();
    
    if (columnsCount === 0) {
      console.log('No columns found. Creating initial Kanban data...');
      
      // Create columns
      const createdColumns = await Column.insertMany(initialColumns);
      console.log(`Created ${createdColumns.length} columns`);
      
      // Distribute tasks among columns
      const tasks = [];
      
      for (let i = 0; i < initialTasks.length; i++) {
        // Assign each task to a column
        const columnIndex = i % createdColumns.length;
        const task = {
          ...initialTasks[i],
          columnId: createdColumns[columnIndex]._id
        };
        tasks.push(task);
      }
      
      // Create tasks
      const createdTasks = await Task.insertMany(tasks);
      console.log(`Created ${createdTasks.length} tasks`);
      
      // Update columns with their respective tasks
      for (const task of createdTasks) {
        await Column.findByIdAndUpdate(
          task.columnId,
          { $push: { taskIds: task._id } }
        );
      }
      
      // Create order (defining the order of columns)
      const columnIds = createdColumns.map(column => column._id);
      await Order.create({ columnIds });
      console.log('Created column order');
      
      console.log('Kanban initialization complete!');
    } else {
      console.log('Kanban data already exists. Skipping initialization.');
    }
  } catch (error) {
    console.error('Error initializing Kanban data:', error);
  }
};

module.exports = initializeKanban;
