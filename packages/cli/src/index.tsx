#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './components/App.js';

// Clear screen and render
process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
render(<App />);
