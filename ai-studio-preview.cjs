'use strict';

// Google AI Studio's web preview serves the standalone Three.js simulator.
// This does not start the Blazor web app or ASP.NET Core API.
process.env.HOST = '0.0.0.0';
process.env.PORT ||= '3000';

require('./tools/webgl/serve.cjs');
