#!/bin/bash

# Open first terminal and run Python app
start "" bash -c "cd ecycle/backend && python app.py"

# Open second terminal and run npm start
start "" bash -c "cd ecycle && npm start"
