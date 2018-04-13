const fs = require('fs');
const axios = require('axios');
const config = require('./deploy-config');

let axiosInstance = axios.create({
    baseURL: config.apiUrl,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
});

function apiLogin() {
    let credentials = {
        username: config.apiUser,
        password: config.apiPass,
        generateRefreshTokentrue: true
    };

    return axiosInstance.post(
        '/login',
        credentials,
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}

function apiUpload(token) {
    let html = fs.readFileSync('./build/index.html', 'utf8');
    let params = {
        html: html
    };

    let pageUpload = axiosInstance.put('/objects/' + config.schemaId + '/' + config.objectIds.page, params, {
        headers: {
            "Content-Type": "application/json",
            'X-Appercode-Session-Token': token
        }
    }).then(res => {
        console.log('List page upload complete...');
    }).catch(function (error) {
        console.log('List page upload error: ');
        console.log(error);
    });
}

apiLogin().then(response => {
    console.log('API Login success...');
    let token = response.data.sessionId;

    config.languages.forEach((lang) => {
        axiosInstance.defaults.headers.common['X-Appercode-Language'] = lang;
        apiUpload(token);
    })
}).catch(function (error) {
    console.log('Login error: ');
    console.log(error);
});