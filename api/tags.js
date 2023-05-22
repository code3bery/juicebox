const express = require('express');
const tagsRouter = express.Router();
const { getPostsByTagName, getAllTags } = require('../db');

tagsRouter.use((req, res, next) => {
    console.log("A request is being made to /tags");

    next();
});

tagsRouter.get('/', async (req, res) => {
    const tags = await getAllTags();  // Change posts to tags

    res.send({
        tags  // Change posts to tags
    });
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    const { tagName } = req.params;
    
    try {
        const allTagPosts = await getPostsByTagName(tagName);
        // use our method to get posts by tag name from the db
        const posts = allTagPosts.filter(post => {

                if (post.active) {
                    return true;
                }
    
                //for a post that belongs to the user, whether active or not
                if (req.user && post.author.id === req.user.id) {
                    return true;
                }
                
                //else
                return false;
            });
    
            res.send({
                posts
            });
        }   catch ({ name, message }) {
                next({ name, message });
    }
});

module.exports = tagsRouter;