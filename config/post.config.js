'use strict';

module.exports = {
    json_content_type: ['application/json'],
    max_file_size: 1024 * 1024 * 100, //100M
    max_fields: 100,
    max_fields_size: 2 * 1024 * 1024, //2M,
    single_file_header: 'x-filename',
    file_upload_path: Beacon.RUNTIME_PATH + Beacon.sep + 'upload',
    file_auto_remove: true,
    log_error: false
};