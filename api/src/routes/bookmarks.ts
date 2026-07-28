import { Router } from 'express';
import {
  getBookmarks,
  getBookmarkedArticleIds,
  addBookmark,
  removeBookmark,
} from '../controllers/bookmarkController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Every route here operates on the caller's own saves, so authentication is the
// only gate needed — there is no role dimension to a reading list.
router.use(authenticate);

// Declared before the `/:articleId` routes so the literal path is not read as an
// article id.
router.get('/ids', getBookmarkedArticleIds);

router.get('/', getBookmarks);
router.post('/:articleId', addBookmark);
router.delete('/:articleId', removeBookmark);

export default router;
