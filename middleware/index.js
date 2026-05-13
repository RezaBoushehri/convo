var middlewareObj = {};
middlewareObj.isLoggedIn = (req, res, next) => {
//   if (req.isAuthenticated()) {
//     // res.redirect("back");
//     return next();
//   }
//   res.redirect("/login");
   if (!req.isAuthenticated || !req.isAuthenticated()) {  
        if (req.session) {  
            req.session.redirectUrl = req.headers.referer || req.originalUrl || req.url;  
        }  
        res.redirect('/login');
    } else {
        next();  
    }  
};
middlewareObj.isUploadAuthorized = async (req, res, next) => {    
    try {        
        if (!req.isAuthenticated || !req.isAuthenticated()) {            
            if (req.session) {                
                req.session.redirectUrl = req.originalUrl;            
            }            
            return res.status(401).end();        
        }
        if (!req.user || !req.user.username) {           
            return res.status(401).end();        
        }
        const fileName = req.params.file;
        if (!fileName) {            
            return res.status(400).end();        
        }
        req.fileName = fileName;        
        // req.username = req.user.username;
        next();
    } catch (err) {        
        console.error("Upload middleware error:", err.message);       
        res.status(500).end();    
    }
};
middlewareObj.isLoggedInAPI = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {        
        return next();    
    }
    return res.status(401).end()
};
module.exports = middlewareObj;
