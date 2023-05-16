const { Client } = require('pg') // imports the pg module

const client = new Client('postgres://localhost:5432/juicebox-dev');

/**
 * USER Methods
 */

async function createUser({ 
  username, 
  password,
  name,
  location
}) {
  try {
    const { rows: [ user ] } = await client.query(`
      INSERT INTO users(username, password, name, location) 
      VALUES($1, $2, $3, $4) 
      ON CONFLICT (username) DO NOTHING 
      RETURNING *;
    `, [username, password, name, location]);

    return user;
  } catch (error) {
    throw error;
  }
}

async function updateUser(id, fields = {}) {
  // build the set string
  const setString = Object.keys(fields).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  // return early if this is called without fields
  if (setString.length === 0) {
    return;
  }

  try {
    const { rows: [ user ] } = await client.query(`
      UPDATE users
      SET ${ setString }
      WHERE id=${ id }
      RETURNING *;
    `, Object.values(fields));

    return user;
  } catch (error) {
    throw error;
  }
}

async function getAllUsers() {
  try {
    const { rows } = await client.query(`
      SELECT id, username, name, location, active 
      FROM users;
    `);

    return rows;
  } catch (error) {
    throw error;
  }
}

async function getUserById(userId) {
  try {
    const { rows: [ user ] } = await client.query(`
      SELECT id, username, name, location, active
      FROM users
      WHERE id=${ userId }
    `);

    if (!user) {
      return null
    }

    user.posts = await getPostsByUser(userId);

    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * POST Methods
 */

async function createPost({
  authorId,
  title,
  content,
  tags = [] 
}) {
  try {
    const { rows: [post] } = await client.query(`
      INSERT INTO posts("authorId", title, content) 
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [authorId, title, content]);

    const tagList = await createTags(tags);

    await addTagsToPost(post.id, tagList);

    return getPostById(post.id); 
  } catch (error) {
    throw error;
  }
}

async function updatePost(postId, fields = {}) {
  const { tags } = fields; // Read off the tags and remove the field
  delete fields.tags;

  const setString = Object.keys(fields).map(
    (key, index) => `"${key}" = $${index + 1}`
  ).join(', ');

  try {
    let updatedPost;

    if (setString.length > 0) {
      // Update the post fields
      const { rows } = await client.query(`
        UPDATE posts
        SET ${setString}
        WHERE id = $${Object.keys(fields).length + 1}
        RETURNING *;
      `, [...Object.values(fields), postId]);

      updatedPost = rows[0];
    } else {
      // No post fields to update, fetch the existing post
      updatedPost = await getPostById(postId);
    }

    if (tags === undefined) {
      return updatedPost;
    }

    // Make any new tags that need to be created
    const tagList = await createTags(tags);
    const tagListIdString = tagList.map(tag => `${tag.id}`).join(', ');

    // Delete any post_tags from the database which aren't in the tagList
    await client.query(`
      DELETE FROM post_tags
      WHERE "tagId" NOT IN (${tagListIdString})
      AND "postId" = $1;
    `, [postId]);

    // Create post_tags as necessary
    await addTagsToPost(postId, tagList);

    return getPostById(postId);
  } catch (error) {
    throw error;
  }
}

async function getAllPosts() {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id
      FROM posts;
    `);

    const posts = await Promise.all(postIds.map(
      post => getPostById(post.id)
    ));

    return posts;
  } catch (error) {
    throw error;
  }
}

async function getPostsByUser(userId) {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id 
      FROM posts 
      WHERE "authorId" = $1;
    `, [userId]);

    const posts = await Promise.all(postIds.map(
      post => getPostById(post.id)
    ));

    return posts;
  } catch (error) {
    throw error;
  }
}

module.exports = {  
  client,
  createUser,
  updateUser,
  getAllUsers,
  getUserById,
  createPost,
  updatePost,
  getAllPosts,
  getPostsByUser
}