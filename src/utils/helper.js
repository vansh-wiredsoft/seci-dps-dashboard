// Excel data type validation

const normalizeDate = (dateStr) => {
  // expects DD/MM/YYYY
  if (!dateStr || typeof dateStr !== "string") return null;

  const [dd, mm, yyyy] = dateStr.split("/");
  if (!dd || !mm || !yyyy) return null;

  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

const isNumber = (val) => {
  if (val === null || val === "") return true; // allow empty
  return !isNaN(Number(val));
};

module.exports = {
  normalizeDate,
  isNumber,
};
