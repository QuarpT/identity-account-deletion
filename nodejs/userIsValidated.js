var AWS = require('aws-sdk');
var http = require('https');
var kms = new AWS.KMS();

function userIsValidated(scGuCookie) {
    return new Promise((resolve, reject) => {
        const options = {
            host: 'idapi.theguardian.com',
            path: '/user/me',
            headers: {
                'Cookie': 'SC_GU_U=' + scGuCookie,
                'Referer': 'https://theguardian.com'
            }
        };

        function processResponse(response) {
            var responseData = '';

            response.on('data', (chunk) => responseData += chunk);

            response.on('end', () => {
                try {
                    const result = {
                        name: "userIsValidated",
                        satisfied: JSON.parse(responseData).user.statusFields.userEmailValidated == true
                    };
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }

        const request = http.request(options);

        request.on('error', networkError => reject(networkError));

        request.on('response', response => processResponse(response));

        request.end();
    })
}

exports.handler = (event, context, callback) => {
    kms.decrypt({ CiphertextBlob: new Buffer(event.stateMachineInput.CiphertextBlob) }).promise()
        .then((data) => {
            const decryptedInput = JSON.parse(data.Plaintext.toString('utf8'));
            userIsValidated(decryptedInput.scGuCookie).then((result) => callback(null, result));
        })
        .catch((error) => callback(error))
};
