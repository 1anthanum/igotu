import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { chatLimiter } from '../middleware/rateLimit';
import { ChatService } from '../services/ChatService';

const router = Router();

// POST /api/chat/sessions — Create a new chat session
router.post('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = ChatService.createSession(req.user!.sub, req.body.title);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/sessions — List all sessions
router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = ChatService.getSessions(req.user!.sub);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/sessions/:id/messages — Get messages for a session
router.get('/sessions/:id/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = ChatService.getMessages(req.params.id, req.user!.sub);
    if (messages === null) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/sessions/:id/messages — Send a message (rate limited per user)
router.post('/sessions/:id/messages', authenticate, chatLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }
    if (content.length > 5000) {
      return res.status(400).json({ error: '消息过长，请控制在5000字以内' });
    }

    const result = await ChatService.sendMessage(req.params.id, req.user!.sub, content);
    const response: any = { role: 'assistant', content: result.text };
    if (result.mood_score !== null) {
      response.mood_score = result.mood_score;
    }
    res.json(response);
  } catch (err: any) {
    if (err.message === 'Session not found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    next(err);
  }
});

// DELETE /api/chat/sessions/:id — Delete a session
router.delete('/sessions/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = ChatService.deleteSession(req.params.id, req.user!.sub);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
