const FilterCounter = ({
  loading = false,
  filteredCount,
  totalCount,
  itemType = "items"
}) => {
  return (
    <div className="text-sm text-gray-400 px-3 py-1 bg-gray-800 rounded">
      {loading ? (
        <span className="text-gray-500">Loading...</span>
      ) : (
        <>
          {filteredCount !== totalCount ? (
            <>
              <span className="text-green-400 font-bold">{filteredCount.toLocaleString()}</span>
              <span className="text-gray-500"> / </span>
              <span className="text-gray-400">{totalCount.toLocaleString()}</span>
              <span className="text-gray-500 ml-1">{itemType}</span>
            </>
          ) : (
            <>
              <span className="text-green-400 font-bold">{totalCount.toLocaleString()}</span>
              <span className="text-gray-500 ml-1">{itemType}</span>
            </>
          )}
        </>
      )}
    </div>
  );
};

export { FilterCounter };