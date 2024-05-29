const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    webpack: (config, { dev }) => {
        config.plugins.push(new CopyPlugin([
            {
                from: './node_modules/taggle/src/minimal.css',
                to: './app/styles/taggle.css'
                cache: true
            },
        ]));
        return config;
    }
};
