module.exports = (router) => {
    router.get('/user/:user/:iframe?', require('./user'));
    router.get('/tag/:tag/:iframe?', require('./tag'));
};
