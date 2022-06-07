import  { Router } from 'worktop';
import { listen } from 'worktop/cache';
import { createClient } from '@supabase/supabase-js'
import { Redis } from "@upstash/redis/cloudflare";

const redis = Redis.fromEnv();

const SUPABASE_USER = '';
const SUPABASE_TOKEN = '';

const database = createClient(
  SUPABASE_USER, SUPABASE_TOKEN
);

const routes = new Router();

routes.add('GET', '/tasks', async (req, res) => {

  // check cache
  const cache = await redis.get('task-list');
  if(cache) {
    res.send(200, cache);
  }

  const { data, error } = await database.from('tasks').select()
  if (error) { throw error };

  await redis.set('task-list', data);

  res.send(200, data);
});

routes.add('POST', '/tasks', async (req, res) => {

  let input = await req.body.json();

  const { data, error } = await database.from('tasks').insert([
    {
      name: input.name
    }
  ])
  if (error) { throw error };

  // clear cache
  await redis.del('task-list');

  res.send(201, data);
});

routes.add('GET', '/tasks/:id', async (req, res) => {

  let taskId = req.params.id;

  const { data, error } = await database.from('tasks')
    .select()
    .eq('id', taskId)
  if (error) { throw error };

  if(data?.length === 0) {
    return res.send(404, 'Task not found');
  }

  res.send(200, data);
});

routes.add('PUT', '/tasks/:id', async (req, res) => {

  let taskId = req.params.id;
  let body = await req.body.json();

  // check if exist
  var { data, error } = await database.from('tasks')
    .select()
    .eq('id', taskId)

  if(data?.length === 0) {
    return res.send(404, 'Task not found');
  }

  var { data, error } = await database.from('tasks')
    .update({ name: body.name })
    .match({ id: taskId})

  // clear cache
  await redis.del('task-list');

  res.send(200, data);
});

routes.add('DELETE', '/tasks/:id', async (req, res) => {

  let taskId = req.params.id;

  const { data, error } = await database
    .from('tasks')
    .delete()
    .match({ id: taskId })

  if (error) { throw error };

  if(data?.length === 0) {
    return res.send(404, 'Task not found');
  }

  res.send(200, 'Task deleted');
});


listen(routes.run);
