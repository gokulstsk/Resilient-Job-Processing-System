const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Resilient Job Processing API',
      version: '1.0.0',
      description: 'API documentation for the smart job queue system.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
    components: {
      schemas: {
        JobRequest: {
          type: 'object',
          required: ['type', 'payload'],
          properties: {
            type: {
              type: 'string',
              enum: ['email', 'payment', 'notification'],
              description: 'The type of job to execute.',
            },
            payload: {
              type: 'object',
              description: 'The job payload data.',
              example: { to: 'user@example.com', subject: 'Welcome!' }
            },
            options: {
              type: 'object',
              description: 'Optional job configuration overrides (e.g. attempts, priority).',
            }
          },
        },
      },
    },
    paths: {
      '/api/jobs': {
        post: {
          summary: 'Enqueue a new job',
          tags: ['Jobs'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/JobRequest'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Job enqueued successfully'
            }
          }
        }
      },
      '/api/jobs/all/logs': {
        get: {
          summary: 'List all job logs',
          tags: ['Jobs'],
          responses: {
            '200': {
              description: 'List of all jobs logs'
            }
          }
        }
      },
      '/api/jobs/{jobId}': {
        get: {
          summary: 'Fetch job status by ID',
          tags: ['Jobs'],
          parameters: [
            {
              in: 'path',
              name: 'jobId',
              schema: { type: 'string' },
              required: true,
              description: 'The job ID'
            }
          ],
          responses: {
            '200': {
              description: 'Job status retrieved successfully'
            }
          }
        }
      },
      '/api/jobs/dlq/list': {
        get: {
          summary: 'List dead-letter queue entries',
          tags: ['Jobs'],
          responses: {
            '200': {
              description: 'List of DLQ jobs'
            }
          }
        }
      }
    }
  },
  apis: [], // Defined inline for simplicity
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
