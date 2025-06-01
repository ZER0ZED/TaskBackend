const express = require('express');
const router = express.Router();
const Column = require('../db/models/Column');
const Task = require('../db/models/Task');
const Order = require('../db/models/Order');

router.get('/data', async (req, res) => {
    try {
        // Fetch data from MongoDB
        const columns = await Column.find({}).lean().exec();
        const tasks = await Task.find({}).lean().exec();
        const order = await Order.findOne({}).populate('columnIds').lean().exec();

        // Create a map to store taskIds for each column
        const columnTaskIdsMap = {};

        // Iterate over tasks to populate the map
        for (const task of tasks) {
            if (!columnTaskIdsMap[task.columnId]) {
                columnTaskIdsMap[task.columnId] = [task._id];
            } else {
                columnTaskIdsMap[task.columnId].push(task._id);
            }
        }

        // Create the response structure expected by the Kanban frontend
        const columnsObject = {};
        const tasksObject = {};

        // Process columns into the expected format
        columns.forEach(column => {
            columnsObject[column._id] = {
                id: column._id,
                name: column.name || 'Untitled Column',
                taskIds: columnTaskIdsMap[column._id] || []
            };
        });

        // Process tasks into the expected format
        tasks.forEach(task => {
            tasksObject[task._id] = {
                id: task._id,
                name: task.name || 'Untitled Task',
                description: task.description || '',
                columnId: task.columnId,
                priority: task.priority || 'low',
                dueDate: task.dueDate || null,
                assignee: task.assignee || null
            };
        });

        // Create final board data structure in the format expected by frontend
        const boardData = {
            columns: columnsObject,
            tasks: tasksObject,
            order: order ? {
                columnIds: order.columnIds.map(col => col._id.toString())
            } : {
                // Provide default order if not found
                columnIds: columns.map(col => col._id.toString())
            }
        };

        res.json(boardData);
    } catch (error) {
        console.error('Error fetching board data:', error);
        // Return a well-formed empty response structure instead of error
        res.json({
            columns: {},
            tasks: {},
            order: { columnIds: [] }
        });
    }
});

// Add endpoints for column operations
router.post('/create-column', async (req, res) => {
    try {
        const { columnData } = req.body;
        
        // Create the new column in database
        const newColumn = await Column.create({
            name: columnData.name || 'New Column',
            // Add any other fields needed
        });
        
        // Update the order to include this new column
        let order = await Order.findOne();
        if (!order) {
            // Create a new order if one doesn't exist
            order = await Order.create({ columnIds: [newColumn._id] });
        } else {
            // Add the new column to existing order
            order.columnIds.push(newColumn._id);
            await order.save();
        }
        
        res.status(201).json({
            success: true,
            column: {
                id: newColumn._id,
                name: newColumn.name,
                taskIds: []
            }
        });
    } catch (error) {
        console.error('Error creating column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add endpoint for updating a column
router.put('/update-column', async (req, res) => {
    try {
        const { columnId, columnName } = req.body;
        
        const updatedColumn = await Column.findByIdAndUpdate(
            columnId,
            { name: columnName },
            { new: true }
        );
        
        if (!updatedColumn) {
            return res.status(404).json({ success: false, message: 'Column not found' });
        }
        
        res.json({
            success: true,
            column: {
                id: updatedColumn._id,
                name: updatedColumn.name
            }
        });
    } catch (error) {
        console.error('Error updating column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add endpoint for column reordering
router.put('/move-column', async (req, res) => {
    try {
        const { newOrdered } = req.body;
        
        // Update the order in the database
        const updatedOrder = await Order.findOneAndUpdate(
            {},
            { columnIds: newOrdered },
            { new: true, upsert: true }
        );
        
        res.json({
            success: true,
            order: {
                columnIds: updatedOrder.columnIds
            }
        });
    } catch (error) {
        console.error('Error moving column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
