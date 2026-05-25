<!DOCTYPE html><html><head>
  <meta charset="utf-8"><title>News | Koi Care</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head><body>
<div class="container mt-4">
  <h3>News</h3>
  <button class="btn btn-success mb-3" onclick="showAdd()">+ Add News</button>
  <div id="newsList" class="row"></div>
</div>

<div id="newsModal" class="modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
  <div class="modal-header"><h5 id="newsTitle"></h5></div>
  <div class="modal-body">
    <input type="hidden" id="NewsID">
    <input id="NewsTitle" class="form-control mb-2" placeholder="Title">
    <textarea id="NewsContent" class="form-control mb-2" placeholder="Content"></textarea>
    <input id="NewsAuthor" class="form-control" placeholder="Author">
  </div>
  <div class="modal-footer">
    <button class="btn btn-primary" onclick="saveNews()">Save</button>
    <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
  </div>
</div></div></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="js/news.js"></script>
</body></html>
