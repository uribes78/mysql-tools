!function () {
    'use strict';
    var Class = require('ee-class')
            , util = require('util')
            , path = require('path')
            , exec = require('child_process').exec
            , fs = require('fs')
            , path = require('path')
            , asyncMethod = require('async-method');

    function checkPath (dirPath, callback) {
        if (typeof callback !== "function")
            callback = function () {};

        fs.stat(dirPath, function (err, st) {
            if (err) return callback(false);
            callback( st.isDirectory() );
        });
    }

    module.exports = new Class({
        /*
         * create dump sql file of database
         * @param {Object} options, {host: 'localhost',  user: 'root', password: '', dumpPath: '/home/backup/test.sql',database: 'test'}
         * @param {Function} callback
         * @returns {undefined}
         */
        dumpDatabase: asyncMethod(function (options, callback) {
            process.nextTick(function () {
                var error
                        , command
                        , params
                        , time
                        , filePath
                        , extName
                        , dirName
                        , ls;
                if (!options.host || !options.user || !options.dumpPath || !options.database) {
                    error = new Error('Invalid options');
                    error.name = 'InvalidOptions';
                    callback(error, null);
                } else {
                    extName = path.extname(options.dumpPath);
                    dirName = path.dirname(options.dumpPath);
                    if (extName && extName.toLowerCase() !== '.sql') {
                        error = new Error('Invalid file type');
                        error.name = 'InvalidFileExtension';
                        callback(error, null);
                        return false;
                    }

                    //Set parameters
                    params = [
                        util.format("-h %s", options.host),
                        util.format("-u %s", options.user)
                    ];

                    checkPath((extName === '') ? options.dumpPath : dirName, function (exists) {
                        if (!exists) {
                            error = new Error('Dump path doesn\'t exists');
                            error.name = 'InvalidPath';
                            callback(error);
                        } else {
                            if (extName && extName.toLowerCase() === '.sql') {
                                filePath = options.dumpPath;
                            } else {
                                time = new Date().getTime();
                                filePath = path.join(
                                            options.dumpPath,
                                            util.format(
                                                "%s-%s.sql",
                                                (options.database + (options.table ? '-' + options.table : '')),
                                                time
                                            )
                                        );
                            }

                            //Validate optional parameters
                            if (options.addDropDatabase)
                                params.push('--add-drop-database');
                            if (options.addDropTable)
                                params.push('--add-drop-table');
                            if (options.noCreateTable)
                                params.push('--no-create-info');
                            if (options.compress)
                                params.push('--compress')
                            if (options.routines)
                                params.push('-R');
                            if (options.condition)
                                params.push( util.format('--where="%s"', options.condition) );
                            if (options.password)
                                params.push( util.format('-p%s', options.password) );

                            params.push(options.database);

                            if (options.table)
                                params.push(options.table);

                            command = util.format('mysqldump  %s > %s', params.join(' '), filePath);

                            ls = exec(command, function (error, stdout, stderr) {
                                if (error !== null)
                                    return callback(error, null, null);
                                else if (stderr)
                                    return callback(stderr, null);

                                callback(null, {
                                    stdout: stdout,
                                    file: filePath,
                                    message: util.format('mysqldump %s file created successfully', filePath)
                                });

                            });
                        }
                    });
                }
            });
        })

                /*
                 * restore dump sql file to database
                 * @param {Object} options, {host: 'localhost', user: 'root', password: '', sqlFilePath: '/home/backup/test1430762417616.sql', database: 'testdb'}
                 * @param {Function} callback
                 * @returns {undefined}
                 */
        , restoreDatabase: asyncMethod(function (options, callback) {
            process.nextTick(function () {
                var error
                        , command
                        , ls;

                if (!options.user || !options.host || !options.sqlFilePath || !options.database) {
                    error = new Error('Invalid Options');
                    error.name = 'InvalidOptions';
                    callback(error, null);
                } else {
                    fs.exists(options.sqlFilePath, function (exists) {
                        if (!exists) {
                            error = new Error('Dump sql path doesn\'t exists');
                            error.name = 'InvalidFilePath';
                            callback(error, null);
                        } else {
                            if (options.password) {
                                command = util.format('mysql -h %s -u %s -p%s %s <%s', options.host, options.user, options.password, options.database, options.sqlFilePath);
                            } else {
                                command = util.format('mysql -h %s -u %s  %s <%s', options.host, options.user, options.database, options.sqlFilePath);
                            }
                            ls = exec(command, function (error, stdout, stderr) {
                                if (error !== null) {
                                    callback(error, null, null);
                                    return false;
                                }
                                callback(null, (stdout ? stdout : stderr), 'Db dump file restored successfully');

                            });
                        }
                    });
                }
            });
        })
    });
}();
